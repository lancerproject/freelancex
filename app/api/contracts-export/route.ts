import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("contracts")
    .select("title, amount, status, start_date, end_date")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("start_date", { ascending: false });

  const rows = data ?? [];
  const header = "title,amount,status,start_date,end_date\n";
  const body = rows
    .map(
      (r) =>
        `"${(r.title ?? "").replace(/"/g, '""')}",${r.amount ?? 0},${
          r.status ?? ""
        },${r.start_date ?? ""},${r.end_date ?? ""}`
    )
    .join("\n");

  return new NextResponse(header + body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=contracts.csv",
    },
  });
}
