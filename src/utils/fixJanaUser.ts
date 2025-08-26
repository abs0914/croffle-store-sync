import { updateAppUser } from "@/services/appUser";
import { AppUserFormData } from "@/types/appUser";

export const fixJanaUser = async () => {
  try {
    // The user data that should have been saved
    const correctUserData: AppUserFormData = {
      id: "adbd59d6-2dc8-4c19-b1f2-10d9f7038fd8", // From the database query
      userId: "0de7b785-381f-4308-8e9a-bfc3bbed822d", // From the database query
      firstName: "jana",
      lastName: "itpark", 
      email: "jana.itpark@thecroffle.com",
      contactNumber: "",
      role: "manager", // Should be manager, not cashier
      storeIds: ["d7c47e6b-f20a-4543-a6bd-000398f72df5"], // Sugbo Mercado (IT Park, Cebu)
      isActive: true,
      // Add any custom permissions if they were specified
      customPermissions: {
        // Add appropriate custom permissions here if needed
        user_management: true,
        inventory_management: true,
        reports: true
      }
    };

    console.log('Fixing Jana user with correct data:', correctUserData);
    const result = await updateAppUser(correctUserData);
    
    if (result) {
      console.log('Successfully updated Jana user:', result);
      return result;
    } else {
      console.error('Failed to update Jana user');
      return null;
    }
  } catch (error) {
    console.error('Error fixing Jana user:', error);
    return null;
  }
};