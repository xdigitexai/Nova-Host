import{redirect}from"next/navigation";export default async function LegacyBot({params}:{params:Promise<{id:string}>}){redirect(`/my-bots/${(await params).id}`)}
