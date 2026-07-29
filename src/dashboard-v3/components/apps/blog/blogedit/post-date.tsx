

import { Card, CardContent, CardHeader, CardTitle } from "@dv3/components/ui/card";
import { Label } from "@dv3/components/ui/label";
import { useState, useContext, useEffect } from "react";
import { BlogContext } from "@dv3/context/blog-context";
// ShadCN UI Date Picker components
import { format } from "date-fns";
import { CalendarCog } from "lucide-react";
import { cn } from "@dv3/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dv3/components/ui/popover";
import { Calendar } from "@dv3/components/ui/calendar";
import { Button } from "@dv3/components/ui/button";

const PostDate = () => {
  const { posts } = useContext(BlogContext);

  const [publishDate, setPublishDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (posts.length > 0 && posts[0].createdAt) {
      setPublishDate(new Date(posts[0].createdAt));
    }
  }, [posts]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h5>Publish Date</h5>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="publishDate">
              Select publish date <span className="text-destructive">*</span>
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
                  <CalendarCog />
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
