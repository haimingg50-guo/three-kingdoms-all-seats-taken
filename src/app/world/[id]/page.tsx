import { Board } from "@/components/game/board";

export const dynamic = "force-dynamic";

export default async function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Board worldId={id} />;
}
