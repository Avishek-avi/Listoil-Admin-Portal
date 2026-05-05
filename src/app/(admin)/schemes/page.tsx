import SchemesClient from "./SchemesClient";
import { getSchemesAction, getSchemeMasterDataAction, getSchemeDashboardStatsAction } from "@/actions/schemes-actions";

export const metadata = {
    title: 'Schemes Management | Listoil Admin',
    description: 'Manage loyalty programs and booster schemes',
};

export default async function SchemesPage() {
    const [schemes, masterData, dashboardStats] = await Promise.all([
        getSchemesAction(),
        getSchemeMasterDataAction(),
        getSchemeDashboardStatsAction()
    ]);

    return (
        <SchemesClient 
            initialSchemes={schemes} 
            masterData={masterData} 
            dashboardStats={dashboardStats}
        />
    );
}
