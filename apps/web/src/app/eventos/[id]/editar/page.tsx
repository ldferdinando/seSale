import { EditarEventoClient } from "./EditarEventoClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarEventoPage({ params }: PageProps) {
  const { id } = await params;

  return <EditarEventoClient eventId={id} />;
}
