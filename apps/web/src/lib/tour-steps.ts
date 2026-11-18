export type TourTarget = {
  name: string;
  hint?: string;
};

export type TourStep = {
  title: string;
  body: string;
  targets: TourTarget[];
};

export const tourSteps = (firstName: string): TourStep[] => [
  {
    title: `Hi ${firstName}, I'm Koinonia`,
    body: "I carry letters between people who care. Can I show you around? Two stops.",
    targets: [],
  },
  {
    title: "Write a letter",
    body: "Start here. Lock it with a key, seal it until a date, or let it burn after reading.",
    targets: [{ name: "new-note" }],
  },
  {
    title: "Care boards",
    body: "One link, many friends, one person to cheer up. Everyone writes on the same board.",
    targets: [{ name: "boards" }, { name: "menu", hint: "They live in the menu." }],
  },
  {
    title: "Your desk is ready",
    body: "Every letter you write waits here. Who will get your first one?",
    targets: [],
  },
];
