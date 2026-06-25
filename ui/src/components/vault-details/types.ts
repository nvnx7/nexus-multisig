export type PendingTx = {
  id: string;
  type: "Deposit" | "Withdraw" | "Transfer";
  recipient: string;
  amount: number;
  signatures: number;
  threshold: number;
  signedByMe: boolean;
  executed: boolean;
};
