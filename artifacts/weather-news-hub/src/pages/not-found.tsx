import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const NOT_FOUND_CLASSES = {
  page:  "min-h-screen w-full flex items-center justify-center bg-gray-50",
  card:  "w-full max-w-md mx-4",
  inner: "flex mb-4 gap-2",
  icon:  "h-8 w-8 text-red-500",
  title: "text-2xl font-bold text-gray-900",
  body:  "mt-4 text-sm text-gray-600",
} as const;

export default function NotFound() {
  return (
    <div className={NOT_FOUND_CLASSES.page}>
      <Card className={NOT_FOUND_CLASSES.card}>
        <CardContent className="pt-6">
          <div className={NOT_FOUND_CLASSES.inner}>
            <AlertCircle className={NOT_FOUND_CLASSES.icon} />
            <h1 className={NOT_FOUND_CLASSES.title}>404 Page Not Found</h1>
          </div>
          <p className={NOT_FOUND_CLASSES.body}>
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
