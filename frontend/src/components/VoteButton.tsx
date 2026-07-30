import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { issuesAPI } from "@/services/api";
import { toast } from "sonner";

interface VoteButtonProps {
  issueId: string;
  votes: number;
  votedBy?: any[];
}

const VoteButton = ({ issueId, votes: initialVotes, votedBy = [] }: VoteButtonProps) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const userHasVoted = user && votedBy && votedBy.some((id) => 
    typeof id === "object" ? (id as any)._id === user.id : id === user.id
  );

  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(!!userHasVoted);
  const [loading, setLoading] = useState(false);

  // Keep internal state in sync with parent properties
  useState(() => {
    setVotes(initialVotes);
    setVoted(!!userHasVoted);
  });

  const handleVote = async () => {
    // 1. ENFORCE CITIZEN AUTHENTICATION AT UI LEVEL
    if (!isAuthenticated) {
      toast.error("Please sign in as a citizen to upvote complaints.");
      navigate("/login/citizen");
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const res = await issuesAPI.vote(issueId);
      const updatedIssue = res.data;
      
      const newVotes = updatedIssue.votes;
      const newUserHasVoted = user && updatedIssue.votedBy && updatedIssue.votedBy.some((id: any) => 
        typeof id === "object" ? id._id === user.id : id === user.id
      );

      setVotes(newVotes);
      setVoted(!!newUserHasVoted);
      toast.success(newUserHasVoted ? "Vote recorded!" : "Vote removed!");
    } catch {
      toast.error("Failed to update vote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
        voted
          ? "bg-[#221.2 83.2% 43%] text-white bg-primary"
          : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      } disabled:opacity-50`}
    >
      <ThumbsUp className={`h-3.5 w-3.5 ${voted ? "fill-white" : ""}`} />
      {votes}
    </button>
  );
};

export default VoteButton;
