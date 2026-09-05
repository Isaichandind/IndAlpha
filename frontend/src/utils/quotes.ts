export interface Quote {
  text: string;
  author: string;
  category: "Finance" | "Psychology" | "Science" | "Strategy";
}

export const QUOTES: Quote[] = [
  // Finance & Investing
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
    category: "Finance"
  },
  {
    text: "In the short run, the market is a voting machine but in the long run, it is a weighing machine.",
    author: "Benjamin Graham",
    category: "Finance"
  },
  {
    text: "Know what you own, and know why you own it.",
    author: "Peter Lynch",
    category: "Finance"
  },
  {
    text: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett",
    category: "Finance"
  },
  {
    text: "The four most dangerous words in investing are: 'this time it's different'.",
    author: "Sir John Templeton",
    category: "Finance"
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
    category: "Finance"
  },
  
  // Behavioral Psychology
  {
    text: "We are prone to overestimate how much we understand about the world and to underestimate the role of chance in events.",
    author: "Daniel Kahneman",
    category: "Psychology"
  },
  {
    text: "Wealth is just the accumulated leftovers after you spend what you take in.",
    author: "Morgan Housel",
    category: "Psychology"
  },
  {
    text: "Doing well with money has a little to do with how smart you are and a lot to do with how you behave.",
    author: "Morgan Housel",
    category: "Psychology"
  },
  {
    text: "A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth.",
    author: "Daniel Kahneman",
    category: "Psychology"
  },

  // Science & Math
  {
    text: "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it.",
    author: "Albert Einstein",
    category: "Science"
  },
  {
    text: "The first principle is that you must not fool yourself, and you are the easiest person to fool.",
    author: "Richard Feynman",
    category: "Science"
  },
  {
    text: "In mathematics the art of proposing a question must be held of higher value than solving it.",
    author: "Georg Cantor",
    category: "Science"
  },

  // Strategy & Risk
  {
    text: "Don't cross a river if it is four feet deep on average.",
    author: "Nassim Nicholas Taleb",
    category: "Strategy"
  },
  {
    text: "I want to be able to explain my mistakes. This means I do only the things I completely understand.",
    author: "Charlie Munger",
    category: "Strategy"
  },
  {
    text: "Heads I win, tails I don't lose much.",
    author: "Mohnish Pabrai",
    category: "Strategy"
  }
];

/**
 * Gets a random quote from the knowledge base.
 */
export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[randomIndex];
}
