import { useEffect } from "react";

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  keywords?: string[];
}

export const getSiteUrl = (): string => {
  const envUrl =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_FRONTEND_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }
  if (
    typeof window !== "undefined" &&
    window.location.origin &&
    !window.location.origin.includes("localhost") &&
    !window.location.origin.includes("127.0.0.1")
  ) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://civic-chain-tau.vercel.app";
};

const DEFAULT_TITLE = "CivicChain | AI-Powered Civic Issue Reporting for Puducherry";
const DEFAULT_DESCRIPTION =
  "CivicChain connects Puducherry citizens with municipal departments. Lodge geotagged civic reports with AI vision classification and track real-time resolution.";
const DEFAULT_KEYWORDS = [
  "CivicChain",
  "Puducherry civic issues",
  "Pondicherry municipal reporting",
  "smart city Puducherry",
  "AI civic issue reporting",
  "pothole complaint Pondicherry",
  "sanitation issue tracker",
  "citizen grievance portal",
];

const updateOrCreateMetaTag = (
  attribute: "name" | "property",
  attributeValue: string,
  content: string
) => {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${attributeValue}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const updateOrCreateLinkTag = (rel: string, href: string) => {
  let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const updateOrCreateScriptTag = (id: string, jsonData: unknown) => {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!jsonData) {
    if (script) {
      script.remove();
    }
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonData);
};

export const SEO = ({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  ogImage,
  ogImageAlt,
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData,
  keywords,
}: SEOProps) => {
  useEffect(() => {
    const siteUrl = getSiteUrl();
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const resolvedCanonical =
      canonicalUrl || `${siteUrl}${currentPath === "/" ? "" : currentPath}`;

    const resolvedTitle = title
      ? title.includes("CivicChain")
        ? title
        : `${title} | CivicChain`
      : DEFAULT_TITLE;

    const resolvedDescription = description || DEFAULT_DESCRIPTION;

    const resolvedOgImage = ogImage
      ? ogImage.startsWith("http")
        ? ogImage
        : `${siteUrl}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`
      : `${siteUrl}/hero-bg.jpg`;

    const resolvedKeywords = keywords && keywords.length > 0
      ? keywords.join(", ")
      : DEFAULT_KEYWORDS.join(", ");

    // Document Title
    document.title = resolvedTitle;

    // Meta Description & Keywords
    updateOrCreateMetaTag("name", "description", resolvedDescription);
    updateOrCreateMetaTag("name", "keywords", resolvedKeywords);

    // Robots Directive
    if (noIndex) {
      updateOrCreateMetaTag("name", "robots", "noindex, nofollow");
      updateOrCreateMetaTag("name", "googlebot", "noindex, nofollow");
    } else {
      updateOrCreateMetaTag(
        "name",
        "robots",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
      updateOrCreateMetaTag(
        "name",
        "googlebot",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
    }

    // Canonical URL
    updateOrCreateLinkTag("canonical", resolvedCanonical);

    // Open Graph Metadata
    updateOrCreateMetaTag("property", "og:site_name", "CivicChain");
    updateOrCreateMetaTag("property", "og:title", resolvedTitle);
    updateOrCreateMetaTag("property", "og:description", resolvedDescription);
    updateOrCreateMetaTag("property", "og:type", ogType);
    updateOrCreateMetaTag("property", "og:url", resolvedCanonical);
    updateOrCreateMetaTag("property", "og:image", resolvedOgImage);
    updateOrCreateMetaTag("property", "og:image:alt", ogImageAlt || "CivicChain Platform for Puducherry");
    updateOrCreateMetaTag("property", "og:locale", "en_IN");

    // Twitter / X Metadata
    updateOrCreateMetaTag("name", "twitter:card", twitterCard);
    updateOrCreateMetaTag("name", "twitter:title", resolvedTitle);
    updateOrCreateMetaTag("name", "twitter:description", resolvedDescription);
    updateOrCreateMetaTag("name", "twitter:image", resolvedOgImage);
    updateOrCreateMetaTag("name", "twitter:image:alt", ogImageAlt || "CivicChain Platform for Puducherry");

    // Schema.org Structured Data
    if (structuredData) {
      updateOrCreateScriptTag("civicchain-structured-data", structuredData);
    } else {
      updateOrCreateScriptTag("civicchain-structured-data", null);
    }
  }, [
    title,
    description,
    canonicalUrl,
    ogType,
    ogImage,
    ogImageAlt,
    twitterCard,
    noIndex,
    structuredData,
    keywords,
  ]);

  return null;
};

export default SEO;
