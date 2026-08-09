export interface Issue {
  _id: string;
  title: string;
  description: string;
  image?: string | null;
  location?: string;
  votes: number;
  department?: string;
  severity?: "Low" | "Medium" | "High" | "Critical";
  category?: string;
  status: string;
  createdAt: string;
  latitude?: string;
  longitude?: string;
  votedBy?: string[];
  reporter?: any;
}

