export type SubscriptionPlan = 'Free' | 'Pro'

export interface UserAccount {
  id: string
  nickname: string
  email: string
  subscriptionPlan: SubscriptionPlan
  color: string
  avatarLabel: string
}

export const currentUserAccountId = 'alex'

export const userAccounts: UserAccount[] = [
  {
    id: 'alex',
    nickname: 'Alex',
    email: 'alex@lemma.ai',
    subscriptionPlan: 'Free',
    color: '#FF8F50',
    avatarLabel: 'A',
  },
  {
    id: 'moelinkcloud',
    nickname: 'moelinkcloud',
    email: 'j4mqmppvs4@privaterelay.appleid.com',
    subscriptionPlan: 'Pro',
    color: '#A855F7',
    avatarLabel: 'MO',
  },
]

export const currentUserAccount =
  userAccounts.find((account) => account.id === currentUserAccountId) ??
  userAccounts[0]
