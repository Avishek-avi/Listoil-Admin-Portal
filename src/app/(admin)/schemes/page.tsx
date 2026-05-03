import SchemesClient from "./SchemesClient";
import { getSchemesAction, getSchemeMasterDataAction } from "@/actions/schemes-actions";

export const metadata = {
    title: 'Schemes Management | Listoil Admin',
    description: 'Manage loyalty programs and booster schemes',
};

export default async function SchemesPage() {
    const [schemes, masterData] = await Promise.all([
        getSchemesAction(),
        getSchemeMasterDataAction()
    ]);

    return (
        <SchemesClient 
            initialSchemes={schemes} 
            masterData={masterData} 
        />
    );
}
