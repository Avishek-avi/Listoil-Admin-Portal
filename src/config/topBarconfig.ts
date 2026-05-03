// src/config/topbarConfig.ts
import { type ActionButton } from "@/components/Layout/Topbar";

type PageConfig = {
  title: string;
  subtitle: string;
  actions?: ActionButton[];
};

export const TOPBAR_CONFIG: Record<string, PageConfig> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Welcome back! Here's your loyalty program overview",
    actions: [
      {
        label: "Refresh",
        icon: "fas fa-sync-alt",
        // you can add a real handler later
      },
    ],
  },

  "/masters-config": {
    title: "Masters & Configuration",
    subtitle: "Manage system masters and configuration settings",
  },

  "/schemes-campaigns": {
    title: "Campaign Management",
    subtitle: "Create and manage promotional campaigns for electrical appliances",
  },

  "/qr-management": {
    title: "QR Management",
    subtitle: "Generate and manage QR codes for products",
    // actions: [
    //   {
    //     label: "Generate QR Codes",
    //     icon: "fas fa-plus",
    //     onClick: () => alert("Generate QR clicked"),
    //   },
    // ],
  },

  "/communication": {
    title: "Communication",
    subtitle: "Create and manage communication campaigns and messages",
  },

  "/finance-compliance": {
    title: "Finance & Compliance",
    subtitle: "Manage financial operations and ensure regulatory compliance",
    actions: [
      {
        label: "Generate Report",
        icon: "fas fa-file-export",
        onClick: () => alert("Generate Report"),
      },
    ],
  },

  "/fraud-detection": {
    title: "Fraud Detection",
    subtitle: "Monitor and prevent fraudulent activities in the system",
    actions: [
      {
        label: "Run Scan",
        icon: "fas fa-search",
        onClick: () => alert("Run Scan"),
      },
    ],
  },

  "/mis-analytics": {
    title: "MIS & Analytics",
    subtitle: "Management Information System and Business Analytics",
    actions: [
      {
        label: "Generate Report",
        icon: "fas fa-file-download",
        onClick: () => alert("Generate Report"),
      },
    ],
  },

  "/role-management": {
    title: "Role Management",
    subtitle: "Manage user roles, permissions, and access control",
    actions: [
      {
        label: "Create Role",
        icon: "fas fa-shield-alt",
        variant: "secondary",
        onClick: () => alert("Create Role"),
      },
    ],
  },

  "/integrations": {
    title: "Integrations",
    subtitle: "Monitor and manage third-party system integrations",
    actions: [
      {
        label: "Add Integration",
        icon: "fas fa-plus",
        onClick: () => alert("Add Integration"),
      },
    ],
  },

  "/process": {
    title: "Process Management",
    subtitle: "Approve/reject scan/transactions and redemption requests",
  },

  "/tickets": {
    title: "Tickets Management",
    subtitle: "Manage customer support tickets and inquiries",
    actions: [
      {
        label: "Create Ticket",
        icon: "fas fa-plus",
        onClick: () => alert("Create Ticket"),
      },
    ],
  },

  "/members": {
    title: "Members Management",
    subtitle: "Manage users, KYC verification, and account controls",
  },

  "/configuration": {
    title: "Configuration",
    subtitle: "Manage system settings and configurations",
    actions: [
      {
        label: "Save All Changes",
        icon: "fas fa-save",
        onClick: () => alert("Save"),
      },
      {
        label: "Reset",
        icon: "fas fa-undo",
        variant: "secondary",
        onClick: () => alert("Reset"),
      },
    ],
  },

  "/event-bus": {
    title: "Event Bus",
    subtitle: "Configure event handlers, execution pipelines, and handler bindings",
  },
  "/schemes": {
    title: "Schemes & Promotions",
    subtitle: "Manage loyalty rewards and booster programs",
  },
};
