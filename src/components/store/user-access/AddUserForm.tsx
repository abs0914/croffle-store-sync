
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

interface AddUserFormProps {
  isSubmitting: boolean;
  onAddUser: (email: string) => void;
}

export default function AddUserForm({ isSubmitting, onAddUser }: AddUserFormProps) {
  const [newUserEmail, setNewUserEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserEmail.trim()) {
      onAddUser(newUserEmail);
      setNewUserEmail("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
      <div className="flex-1">
        <Label htmlFor="newUserEmail" className="sr-only">
          Add User by Email
        </Label>
        <Input
          id="newUserEmail"
          placeholder="Add user by email address"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting || !newUserEmail.trim()}
        className="flex items-center"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Add User
      </Button>
    </form>
  );
}
