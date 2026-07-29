import BreadcrumbComp from '@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp';
import BasicTable from '@dv3/components/tables/basic-table/BasicTable';
import CheckboxTable from '@dv3/components/tables/checkbox-table/CheckboxTable';
import HoverTable from '@dv3/components/tables/hover-table/HoverTable';
import StripedRowTable from '@dv3/components/tables/striped-row-table/StripedRowTable';
import DataTable from '@dv3/components/tables/data-table/DataTable';
import { EmployeeData } from '@dv3/components/tables/table-data';
import StyleDivider from '@dv3/components/shared/StyleDivider';
import StyleAwareWrapper from '@dv3/components/shared/StyleAwareWrapper';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Tables' },
];

function TablesPage() {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
    >
      <BreadcrumbComp title="Tables" items={BCrumb} />
      <StyleDivider />

      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 gap-px bg-border">
        <div className="col-span-12">
          <BasicTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <DataTable data={EmployeeData} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <HoverTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <StripedRowTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <CheckboxTable />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
      </StyleAwareWrapper>

    </StyleAwareWrapper>
  );
}

export default TablesPage;
