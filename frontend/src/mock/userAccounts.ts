export interface UserAccount {
  id: string
  name: string
  plan: string
  email: string
  color: string
  avatarLabel: string
}

export const currentUserAccountId = 'alex'

export const userAccounts: UserAccount[] = [
  {
    id: 'alex',
    name: 'Alex',
    plan: '免费版',
    email: 'alex@lemma.ai',
    color: '#FF8F50',
    avatarLabel: 'A',
  },
  {
    id: 'moelinkcloud',
    name: 'moelinkcloud',
    plan: 'Plus',
    email: 'j4mqmppvs4@privaterelay.appleid.com',
    color: '#A855F7',
    avatarLabel: 'MO',
  },
]

export const currentUserAccount =
  userAccounts.find((account) => account.id === currentUserAccountId) ??
  userAccounts[0]
