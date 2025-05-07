
import StoreUserAccessContainer from "./user-access/StoreUserAccessContainer";

interface StoreUserAccessProps {
  storeId: string;
}

export default function StoreUserAccess({ storeId }: StoreUserAccessProps) {
  return <StoreUserAccessContainer storeId={storeId} />;
}
