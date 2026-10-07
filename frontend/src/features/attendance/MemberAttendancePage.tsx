import { useParams } from "react-router-dom";
import { MyAttendancePage } from "./MyAttendancePage";

export function MemberAttendancePage() {
  const { id } = useParams();
  return <MyAttendancePage memberId={Number(id)} back={`/owner/members/${id}`} />;
}
