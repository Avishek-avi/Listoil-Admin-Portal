// src/components/PageWithTopBar.tsx

'use client';
import TopBar from "./Layout/Topbar";
import { TOPBAR_CONFIG } from "@/config/topBarconfig";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default function PageWithTopBar({ children }: Props) {
  const pathname = usePathname();
  const cfg = TOPBAR_CONFIG[pathname] ?? {
    title: "Untitled",
    subtitle: "",
  };

  return (
    <>
      <TopBar title={cfg.title} subtitle={cfg.subtitle} actions={cfg.actions} />
      {children}
    </>
  );
}