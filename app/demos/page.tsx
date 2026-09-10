"use client";

import dynamic from "next/dynamic";

const DemosClient = dynamic(() => import("./DemosClient"), { ssr: false });

export default function DemosPage() {
  return <DemosClient />;
}
