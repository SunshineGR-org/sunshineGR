export type Organization = {
  uid: number | string;
  uid_label: string;
  label: string | undefined;
};

export type Vendor = {
  name: string;
  afm: string;
}

export type VendorAssignments = {
  vendor_name: string;
  vendor_afm: number;
  number_of_assignments: number;
  totalAmount: number;
};



export type Decisions = {
  ada: string;
  date: object;
  subject: string;
  documentUrl: string;
  decisionTypeId: string;
}

// Inherits from Decisions
export type SpendingDecisions = Decisions & {
  amount: number;
  vendor_name: string;
  vendor_afm: string;
}

export type AnatheseisDecisionsWithAI = SpendingDecisions & {
  score: number;
}

export type DecisionBreakdown = {
  type: string;
  type_id: string;
  count: number;
}

export type AnnualDecisionBreakdown = DecisionBreakdown & {
  year: number;
}

export type SpendingFilter = {
  organizations: string[] | undefined;
  afm: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  vendors: string[] | undefined;
}

export type SpendingDecisionSummary = {
  amount: number;
  count: number;
  countNoAmount: number;
  count45k: number;
}

export type MagicSearchQuery = {
  q: string;
}

export type UserData = {
  restrictOrgs: number[];
  uid: string;
}
