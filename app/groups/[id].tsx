import { useLocalSearchParams } from "expo-router"
import { GroupScreen } from "../../src/screens/Journal"

export default function GroupRoute() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : undefined
  return <GroupScreen groupId={id} />
}
