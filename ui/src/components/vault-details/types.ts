export type PendingTx = {
  id: string;
  type: "Withdraw" | "Transfer";
  recipient: string;
  amount: number;
  signatures: number;
  threshold: number;
  signedByMe: boolean;
  executed: boolean;
};
