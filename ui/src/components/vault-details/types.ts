export type PendingTx = {
  id: string;
  type: "Deposit" | "Withdraw" | "Transfer";
  recipient: string;
  amount: string;
  signatures: number;
  threshold: number;
  signedByMe: boolean;
  executed: boolean;
};
