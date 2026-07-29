import AdvertisementCost from "@dv3/components/dashboards/modern/advertisement-cost";
import OverviewTab from "@dv3/components/dashboards/modern/overview-tab";
import TotalOrders from "@dv3/components/dashboards/modern/total-orders";
import TotalProfit from "@dv3/components/dashboards/modern/total-profit";
import TotalSales from "@dv3/components/dashboards/modern/total-sales";
import UpdateBanner from "@dv3/components/dashboards/modern/update-banner"
import TotalAssets from "@dv3/components/dashboards/modern/totals-assets";
import ProjectsOrders from "@dv3/components/dashboards/modern/projects-orders";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const page = () => {
  return (
    <>
      <div className="pb-4">
        <OverviewTab />
      </div>
      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 p-px gap-px bg-border"
        defaultClassName="grid grid-cols-12 gap-4"
      >
        <div className="col-span-12">
          <UpdateBanner />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-7 col-span-12">
          <TotalSales />
        </div>
        <div className="lg:col-span-5 col-span-12">
          <TotalAssets />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="lg:col-span-4 col-span-12">
          <TotalOrders />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <TotalProfit />
        </div>
        <div className="lg:col-span-4 col-span-12">
          <AdvertisementCost />
        </div>
        <StyleDivider wrapperClassName="col-span-12" />
        <div className="col-span-12">
          <ProjectsOrders />
        </div>
      </StyleAwareWrapper>
    </>
  );
};

export default page;
