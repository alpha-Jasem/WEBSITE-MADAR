

import { Label } from "@dv3/components/ui/label";
import { useState } from "react";

// ShadCN UI Date Picker components
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@dv3/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dv3/components/ui/popover";
import { Calendar } from "@dv3/components/ui/calendar";
import { Button } from "@dv3/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dv3/components/ui/card";

const PostDate = () => {
  // Set today's date as default

  const [publishDate, setPublishDate] = useState<Date | undefined>(new Date());

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h5>Publish Date</h5>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div>
          <div className="mb-2">
            <Label htmlFor="publishDate">
              Select publish date
              <span className="text-destructive">*</span>
            </Label>
          </div>
          <div>
            <Popover>
              <PopoverTrigger className={"w-full"}>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !publishDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon />
                  {publishDate ? (
                    format(publishDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <Calendar
                  mode="single"
                  selected={publishDate}
                  onSelect={setPublishDate}

                />
              </PopoverContent>
            </Popover>
          </div>
          <small className="text-xs text-muted-foreground">
            Choose the date when this blog post should be published.
          </small>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostDate;
