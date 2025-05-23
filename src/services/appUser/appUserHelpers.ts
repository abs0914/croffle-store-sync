
import { AppUser } from "@/types/appUser";

// Helper function to map app users from database result
export const mapAppUsers = (data: any[]): AppUser[] => {
  console.log(`Mapping ${data.length} app users`);
  return data.map((user): AppUser => ({
    id: user.id,
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    contactNumber: user.contact_number,
    role: user.role,
    storeIds: user.store_ids || [],
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
};
