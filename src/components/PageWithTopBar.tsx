// src/components/PageWithTopBar.tsx

'use client';
import TopBar from "./Layout/Topbar";
import { TOPBAR_CONFIG } from "@/config/topBarconfig";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function PageWithTopBar({ children, title, subtitle }: Props) {
  const pathname = usePathname();
  const cfg = TOPBAR_CONFIG[pathname] ?? {
    title: "Untitled",
    subtitle: "",
  };

  return (
    <>
      <TopBar title={title ?? cfg.title} subtitle={subtitle ?? cfg.subtitle} actions={cfg.actions} />
      {children}
    </>
  );
}
