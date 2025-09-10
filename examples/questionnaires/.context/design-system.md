# Design System

## Components

---

### Accordion

**Usage**

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
  </AccordionItem>
</Accordion>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `type`_ | `enum` | _(No default)_ |
| `value` | `string` | _(No default)_ |
| `defaultValue` | `string` | _(No default)_ |
| `onValueChange` | `function` | _(No default)\* |
| `collapsible` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `dir` | `enum` | `"ltr"` |
| `orientation` | `enum` | `"vertical"` |

---

### Alert

**Usage**

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>You can add components to your app using the cli.</AlertDescription>
</Alert>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Alert-dialog

**Usage**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger>Open</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Aspect-ratio

**Usage**

```tsx
import { AspectRatio } from '@/components/ui/aspect-ratio';

<AspectRatio ratio={16 / 9}>
  <img src="/thumbnail.jpg" alt="Photo" className="rounded-md object-cover" />
</AspectRatio>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `ratio` | `number` | `1` |

---

### Avatar

**Usage**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `src` | `string` | _(No default)_ |
| `alt` | `string` | _(No default)_ |
| `onError` | `function`| _(No default)_ |

---

### Badge

**Usage**

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Badge</Badge>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `variant` | `enum` | `default` |

---

### Breadcrumb

**Usage**

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Button

**Usage**

```tsx
import { Button } from '@/components/ui/button';

<Button>Button</Button>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `variant` | `enum` | `default` |
| `size` | `enum` | `default` |
| `disabled`| `boolean` | `false` |

---

### Calendar

**Usage**

```tsx
import { Calendar } from '@/components/ui/calendar';

<Calendar mode="single" selected={new Date()} onSelect={console.log} />;
```

**API Reference**
| Prop | Type | Default |
|--------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `mode` | `enum` | `single` |
| `selected` | `Date` | _(No default)_ |
| `onSelect` | `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |
| `initialFocus`| `boolean` | `false` |

---

### Card

**Usage**

```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>Card Content</CardContent>
  <CardFooter>Card Footer</CardFooter>
</Card>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Carousel

**Usage**

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

<Carousel>
  <CarouselContent>
    <CarouselItem>Item 1</CarouselItem>
    <CarouselItem>Item 2</CarouselItem>
    <CarouselItem>Item 3</CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `loop` | `boolean` | `false` |

---

### Chart

**Usage**

```tsx
import { Chart } from '@/components/ui/chart';

<Chart data={data} options={options} />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| _(custom)_| | |

---

### Checkbox

**Usage**

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox />;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `checked` | `boolean` | _(No default)_ |
| `defaultChecked`| `boolean` | `false` |
| `onCheckedChange`| `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |
| `required` | `boolean` | `false` |
| `name` | `string` | _(No default)_ |
| `value` | `string` | _(No default)_ |
| `id` | `string` | _(No default)_ |

---

### Collapsible

**Usage**

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

<Collapsible>
  <CollapsibleTrigger>Open</CollapsibleTrigger>
  <CollapsibleContent>Collapsible content goes here.</CollapsibleContent>
</Collapsible>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |

---

### Command

**Usage**

```tsx
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

<Command>
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Item 1</CommandItem>
      <CommandItem>Item 2</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Context-menu

**Usage**

```tsx
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

<ContextMenu>
  <ContextMenuTrigger asChild>
    <Button>Right click me</Button>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Profile</ContextMenuItem>
    <ContextMenuItem>Settings</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Dialog

**Usage**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure absolutely sure?</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Cancel</Button>
      <Button>Continue</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Drawer

**Usage**

```tsx
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Are you sure absolutely sure?</DrawerTitle>
      <DrawerDescription>This action cannot be undone.</DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <Button>Cancel</Button>
      <Button>Continue</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Dropdown-menu

**Usage**

```tsx
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Billing</DropdownMenuItem>
    <DropdownMenuItem>Team</DropdownMenuItem>
    <DropdownMenuItem>Subscription</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Hover-card

**Usage**

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

<HoverCard>
  <HoverCardTrigger>Hover me</HoverCardTrigger>
  <HoverCardContent>Hover card content</HoverCardContent>
</HoverCard>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `openDelay` | `number` | `700` |
| `closeDelay` | `number` | `300` |

---

### Input

**Usage**

```tsx
import { Input } from '@/components/ui/input';

<Input type="email" placeholder="Email" />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `type` | `string` | `text` |
| `value` | `string` | _(No default)_ |
| `defaultValue`|`string`| _(No default)_ |
| `onChange`| `function`| _(No default)_ |
| `disabled`| `boolean` | `false` |

---

### Input-otp

**Usage**

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `maxLength` | `number` | _(No default)_ |
| `value` | `string` | _(No default)_ |
| `onChange` | `function`| _(No default)_ |

---

### Label

**Usage**

```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="email">Email</Label>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `htmlFor` | `string` | _(No default)_ |

---

### Logo

**Usage**

```tsx
// Placeholder: No standard shadcn-ui Logo component. Use your own logo component.
import { Logo } from '@/components/ui/logo';

<Logo />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| _(custom)_| | |

---

### Menubar

**Usage**

```tsx
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';

<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New Tab</MenubarItem>
      <MenubarItem>New Window</MenubarItem>
      <MenubarSeparator />
      <MenubarItem>Exit</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |

---

### Navigation-menu

**Usage**

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu';

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Item One</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink href="/item-one">Item One Link</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
  <NavigationMenuIndicator />
  <NavigationMenuViewport />
</NavigationMenu>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `orientation` | `enum` | `horizontal` |
| `dir` | `enum` | `ltr` |

---

### Pagination

**Usage**

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Popover

**Usage**

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild>
    <Button>Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `modal` | `boolean` | `true` |

---

### Progress

**Usage**

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={50} />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `value` | `number` | `0` |

---

### Radio-group

**Usage**

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<RadioGroup defaultValue="option-one">
  <RadioGroupItem value="option-one" id="r1" />
  <RadioGroupItem value="option-two" id="r2" />
</RadioGroup>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `value` | `string` | _(No default)_ |
| `defaultValue` | `string` | _(No default)_ |
| `onValueChange` | `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |

---

### Resizable

**Usage**

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={25}>Panel 1</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={75}>Panel 2</ResizablePanel>
</ResizablePanelGroup>;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `direction` | `enum` | `horizontal` |
| `defaultSize`| `number` | _(No default)_ |

---

### Scroll-area

**Usage**

```tsx
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">{/* Content here */}</div>
  <ScrollBar orientation="vertical" />
  <ScrollBar orientation="horizontal" />
</ScrollArea>;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `orientation`| `enum` | `vertical` |

---

### Select

**Usage**

```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="blueberry">Blueberry</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `value` | `string` | _(No default)_ |
| `defaultValue` | `string` | _(No default)_ |
| `onValueChange` | `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |
| `required` | `boolean` | `false` |
| `name` | `string` | _(No default)_ |

---

### Separator

**Usage**

```tsx
import { Separator } from '@/components/ui/separator';

<Separator />;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `orientation`| `enum` | `horizontal` |
| `decorative` | `boolean` | `false` |

---

### Sheet

**Usage**

```tsx
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
      <SheetDescription>Sheet Description</SheetDescription>
    </SheetHeader>
    <SheetFooter>
      <SheetClose>Close</SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `side` | `enum` | `right` |

---

### Sidebar

**Usage**

```tsx
// Placeholder: No standard shadcn-ui Sidebar component. Use your own sidebar implementation.
import { Sidebar } from '@/components/ui/sidebar';

<Sidebar>{/* Sidebar content */}</Sidebar>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| _(custom)_| | |

---

### Skeleton

**Usage**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-1/2" />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |

---

### Slider

**Usage**

```tsx
import { Slider } from '@/components/ui/slider';

<Slider defaultValue={[50]} max={100} step={1} />;
```

**API Reference**
| Prop | Type | Default |
|--------------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `defaultValue`|`number[]`| `[0]` |
| `value` | `number[]`| _(No default)_ |
| `onValueChange`|`function`| _(No default)_ |
| `max` | `number` | `100` |
| `min` | `number` | `0` |
| `step` | `number` | `1` |
| `disabled` | `boolean` | `false` |

---

### Sonner

**Usage**

```tsx
// Placeholder: No standard shadcn-ui Sonner component. Use your own toast/notification system.
import { Sonner } from '@/components/ui/sonner';

<Sonner />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| _(custom)_| | |

---

### Switch

**Usage**

```tsx
import { Switch } from '@/components/ui/switch';

<Switch />;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `checked` | `boolean` | _(No default)_ |
| `defaultChecked`| `boolean` | `false` |
| `onCheckedChange`|`function` | _(No default)_ |
| `disabled` | `boolean` | `false` |
| `required` | `boolean` | `false` |
| `name` | `string` | _(No default)_ |
| `value` | `string` | _(No default)_ |
| `id` | `string` | _(No default)_ |

---

### Table

**Usage**

```tsx
// Placeholder: No standard shadcn-ui Table component. Use your own table implementation or a library.
import { Table } from '@/components/ui/table';

<Table>{/* Table content */}</Table>;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| _(custom)_| | |

---

### Tabs

**Usage**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account content</TabsContent>
  <TabsContent value="password">Password content</TabsContent>
</Tabs>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `value` | `string` | _(No default)_ |
| `defaultValue` | `string` | _(No default)_ |
| `onValueChange` | `function` | _(No default)_ |
| `orientation` | `enum` | `horizontal` |
| `dir` | `enum` | `ltr` |

---

### Textarea

**Usage**

```tsx
import { Textarea } from '@/components/ui/textarea';

<Textarea placeholder="Type your message here." />;
```

**API Reference**
| Prop | Type | Default |
|-----------|-----------|-----------------|
| `asChild` | `boolean` | `false` |
| `value` | `string` | _(No default)_ |
| `defaultValue`|`string`| _(No default)_ |
| `onChange`| `function`| _(No default)_ |
| `disabled`| `boolean` | `false` |

---

### Toggle

**Usage**

```tsx
import { Toggle } from '@/components/ui/toggle';

<Toggle aria-label="Toggle italic">
  <ItalicIcon className="h-4 w-4" />
</Toggle>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `pressed` | `boolean` | _(No default)_ |
| `defaultPressed`| `boolean` | `false` |
| `onPressedChange`|`function` | _(No default)_ |
| `disabled` | `boolean` | `false` |

---

### Toggle-group

**Usage**

```tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

<ToggleGroup type="single" defaultValue="bold">
  <ToggleGroupItem value="bold" aria-label="Bold">
    <BoldIcon className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="italic" aria-label="Italic">
    <ItalicIcon className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `type` | `enum` | _(No default)_ |
| `value` | `string` | _(No default)_ |
| `defaultValue` | `string` | _(No default)_ |
| `onValueChange` | `function` | _(No default)_ |
| `disabled` | `boolean` | `false` |
| `rovingFocus` | `boolean` | `true` |
| `orientation` | `enum` | `horizontal` |
| `dir` | `enum` | `ltr` |

---

### Tooltip

**Usage**

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>Tooltip content</TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

**API Reference**
| Prop | Type | Default |
|-----------------|-------------|-------------------|
| `asChild` | `boolean` | `false` |
| `open` | `boolean` | _(No default)_ |
| `defaultOpen` | `boolean` | `false` |
| `onOpenChange` | `function` | _(No default)_ |
| `delayDuration` | `number` | `700` |
| `disableHoverableContent`|`boolean`|`false` |

## Theme

```css
@import 'tailwindcss';

@theme {
  --color-background: #ffffff;
  --color-foreground: #111111;
  --color-card: #ffffff;
  --color-card-foreground: #111111;
  --color-popover: #ffffff;
  --color-popover-foreground: #111111;
  --color-primary: #0066cc;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f5f5f5;
  --color-secondary-foreground: #111111;
  --color-destructive: #e60023;
  --color-destructive-foreground: #ffffff;
  --color-muted: #f0f0f0;
  --color-muted-foreground: #666666;
  --color-accent: #f7f7f7;
  --color-accent-foreground: #111111;
  --color-border: #e5e5e5;
  --color-input: #e5e5e5;
  --color-ring: #d6d6d6;

  --color-chart-1: #0066cc;
  --color-chart-2: #999999;
  --color-chart-3: #666666;
  --color-chart-4: #e60023;
  --color-chart-5: #ffcc00;

  --color-sidebar: #ffffff;
  --color-sidebar-foreground: #111111;
  --color-sidebar-primary: #0066cc;
  --color-sidebar-primary-foreground: #ffffff;
  --color-sidebar-accent: #f5f5f5;
  --color-sidebar-accent-foreground: #111111;
  --color-sidebar-border: #e5e5e5;
  --color-sidebar-ring: #d6d6d6;

  --radius-sm: calc(0.5rem - 4px);
  --radius-md: calc(0.5rem - 2px);
  --radius-lg: 0.5rem;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```
