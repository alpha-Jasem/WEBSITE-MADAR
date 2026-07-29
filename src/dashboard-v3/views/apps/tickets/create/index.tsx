import CreateTicketForm from "@dv3/components/apps/tickets/create-ticketform";
import { TicketProvider } from "@dv3/context/ticket-context";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Tickets" },
];

const CreateTickets = () => {
  return (
    <TicketProvider>
      <StyleAwareWrapper
        lyraClassName="flex flex-col p-px gap-px bg-border"
        defaultClassName="flex flex-col gap-4"
      >
        <BreadcrumbComp title="Tickets App" items={BCrumb} />
        <StyleDivider />
        <CreateTicketForm />
      </StyleAwareWrapper>
    </TicketProvider>
  );
};

export default CreateTickets;
