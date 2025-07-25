import { CardsCalendar } from '@/components/cards/calendar';
import { CardsChat } from '@/components/cards/chat';
import { CardsCookieSettings } from '@/components/cards/cookie-settings';
import { CardsCreateAccount } from '@/components/cards/create-account';
import { CardsExerciseMinutes } from '@/components/cards/exercise-minutes';
import { CardsForms } from '@/components/cards/forms';
import { CardsPayments } from '@/components/cards/payments';
import { CardsReportIssue } from '@/components/cards/report-issue';
import { CardsShare } from '@/components/cards/share';
import { CardsTeamMembers } from '@/components/cards/team-members';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { IconTrendingUp } from '@tabler/icons-react';
import { TemperatureSelector } from '@/app/(app)/examples/playground/components/temperature-selector';

export function CardsDemo() {
  return (
    <div className="md:grids-col-2 grid **:data-[slot=card]:shadow-none md:gap-4 lg:grid-cols-10 xl:grid-cols-11">
      <div className="grid gap-4 lg:col-span-4 xl:col-span-6">
        {/*<CardsStats />*/}
        <div className="grid gap-1 sm:grid-cols-[auto_1fr] md:hidden">
          <CardsCalendar />
          <div className="pt-3 sm:pt-0 sm:pl-2 xl:pl-4">{/*<CardsActivityGoal />*/}</div>
          <div className="pt-3 sm:col-span-2 xl:pt-4">
            <CardsExerciseMinutes />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <CardsForms />
            <CardsTeamMembers />
            <CardsCookieSettings />
          </div>
          <div className="flex flex-col gap-4">
            <CardsCreateAccount />
            <CardsChat />
            <div className="hidden xl:block">
              <CardsReportIssue />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 lg:col-span-6 xl:col-span-5">
        <div className="hidden gap-1 sm:grid-cols-[auto_1fr] md:grid">
          <CardsCalendar />
          <div className="pt-3 sm:pt-0 sm:pl-2 xl:pl-3">
            {/*<CardsActivityGoal />*/}
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">$1,250.00</CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <IconTrendingUp />
                    +12.5%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Trending up this month <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">Visitors for the last 6 months</div>
              </CardFooter>
            </Card>
            <div className="mt-4">
              <TemperatureSelector defaultValue={[0.4]} />
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <CardsPayments />
        </div>
        <CardsShare />
        <div className="xl:hidden">
          <CardsReportIssue />
        </div>
      </div>
    </div>
  );
}
