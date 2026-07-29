
import { Card } from "@dv3/components/ui/card";
import TicketFilter from "@dv3/components/apps/tickets/ticket-filter";
import TicketListing from "@dv3/components/apps/tickets/ticket-listing";
import { TicketProvider } from "@dv3/context/ticket-context/index";

const TicketsApp = () => {
  return (
    <>
      <TicketProvider>
        <Card className="p-6">
          <TicketFilter />
          <TicketListing />
        </Card>
      </TicketProvider>
    </>
  );
};

export default TicketsApp;
