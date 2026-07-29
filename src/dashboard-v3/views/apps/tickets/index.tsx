import TicketsApp from "@dv3/components/apps/tickets";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Tickets" },
];

const Tickets = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Tickets App" items={BCrumb} />
      <StyleDivider />
      <TicketsApp />
    </StyleAwareWrapper>
  );
};

export default Tickets;
