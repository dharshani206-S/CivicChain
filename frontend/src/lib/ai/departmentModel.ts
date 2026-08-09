import * as tf from "@tensorflow/tfjs";

export type DepartmentModelMetadata = {
  imageSize?: number;
  grayscale?: boolean;
  labels?: string[];
};

export type DepartmentPrediction = {
  label: string;
  probability: number;
  probabilities: Record<string, number>;
};

export interface DepartmentMappingResult {
  prediction: DepartmentPrediction;
  isInvalid: boolean;
  department: string | null;
  message: string;
}

const MODEL_URL = "/ai-model/model.json";
const METADATA_URL = "/ai-model/metadata.json";

let modelPromise: Promise<tf.LayersModel> | null = null;
let metadataPromise: Promise<DepartmentModelMetadata | null> | null = null;

export const loadDepartmentModel = async (): Promise<tf.LayersModel> => {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      return tf.loadLayersModel(MODEL_URL);
    })();
  }

  return modelPromise;
};

export const loadDepartmentMetadata = async (): Promise<DepartmentModelMetadata | null> => {
  if (!metadataPromise) {
    metadataPromise = (async () => {
      try {
        const res = await fetch(METADATA_URL);
        if (!res.ok) return null;
        const data = (await res.json()) as unknown;
        if (!data || typeof data !== "object") return null;
        return data as DepartmentModelMetadata;
      } catch {
        return null;
      }
    })();
  }

  return metadataPromise;
};

export const loadDepartmentLabels = async (): Promise<string[]> => {
  const metadata = await loadDepartmentMetadata();
  if (!metadata?.labels) return [];
  return metadata.labels.filter((label): label is string => typeof label === "string" && label.trim().length > 0);
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
};

export const predictDepartmentFromImage = async (file: File): Promise<DepartmentPrediction | null> => {
  const [model, metadata, labels] = await Promise.all([
    loadDepartmentModel(),
    loadDepartmentMetadata(),
    loadDepartmentLabels(),
  ]);

  const img = await loadImageFromFile(file);
  const imageSize = metadata?.imageSize ?? 224;
  const grayscale = metadata?.grayscale ?? false;

  const probabilitiesArray = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(img).toFloat(); // [h,w,3]
    const input = (grayscale ? tf.mean(pixels, 2, true) : pixels) as tf.Tensor3D;
    const resized = tf.image.resizeBilinear(input, [imageSize, imageSize]);

    // Teachable Machine MobileNet normalization: [-1, 1]
    const normalized = resized.div(127.5).sub(1);
    const batched = normalized.expandDims(0); // [1, 224, 224, 3]

    const output = model.predict(batched);
    const tensor = Array.isArray(output) ? output[0] : output;
    return Array.from(tensor.dataSync());
  });

  if (!probabilitiesArray.length) return null;

  const classLabels =
    labels.length === probabilitiesArray.length
      ? labels
      : probabilitiesArray.map((_, index) => `Class ${index + 1}`);

  let bestIndex = 0;
  for (let i = 1; i < probabilitiesArray.length; i += 1) {
    if (probabilitiesArray[i] > probabilitiesArray[bestIndex]) bestIndex = i;
  }

  const probabilities = Object.fromEntries(
    classLabels.map((label, index) => [label, probabilitiesArray[index] ?? 0]),
  );

  return {
    label: classLabels[bestIndex] ?? classLabels[0] ?? "Unknown",
    probability: probabilitiesArray[bestIndex] ?? 0,
    probabilities,
  };
};

/**
 * Maps the 5 Teachable Machine classes to civic departments or invalid status
 */
export const mapPredictionToDepartment = (
  prediction: DepartmentPrediction
): DepartmentMappingResult => {
  const label = prediction.label;

  if (label === "Invalid" || label.toLowerCase().includes("invalid")) {
    return {
      prediction,
      isInvalid: true,
      department: null,
      message: "The uploaded image does not appear to contain a valid civic complaint (e.g. human photo, selfie, document, or non-issue image). Please upload a clear photo of a civic issue.",
    };
  }

  if (label === "Sanitation") {
    return {
      prediction,
      isInvalid: false,
      department: "Sanitation",
      message: "Detected Sanitation issue (garbage pile, bin overflow, dumping).",
    };
  }

  if (label === "Water Supply") {
    return {
      prediction,
      isInvalid: false,
      department: "Water Supply",
      message: "Detected Water Supply issue (pipeline leak, water overflow).",
    };
  }

  if (label === "Road Infrastructure") {
    return {
      prediction,
      isInvalid: false,
      department: "Road Infrastructure",
      message: "Detected Road Infrastructure issue (pothole, road crack, damaged pavement).",
    };
  }

  if (label === "Street Lights") {
    return {
      prediction,
      isInvalid: false,
      department: "Street Lights",
      message: "Detected Street Lights issue (broken light, non-working light, damaged pole).",
    };
  }

  return {
    prediction,
    isInvalid: false,
    department: label,
    message: `Detected ${label} issue.`,
  };
};
