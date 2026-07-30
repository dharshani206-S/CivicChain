export interface Issue {
  _id: string;
  title: string;
  description: string;
  image?: string | null;
  location?: string;
  votes: number;
  department?: string;
  status: string;
  createdAt: string;
  latitude?: string;
  longitude?: string;
  votedBy?: string[];
  reporter?: any;
}

