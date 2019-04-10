type Conditional = 'greater than' | 'less than' | 'equal to'

interface IAlert {
  lookTitle: string
  lookId: number
  lookLink: string
  setBy: {
    id: number
    name: string
  }
  setAt: Date
  alert: {
    baseField: string
    conditional: Conditional | string
    compareField: string
  }
}

interface IAlertsState {
  savedAlerts: Record<string, IAlert>
  addAlert: (alert: IAlert) => void
}

export const AlertsState: IAlertsState = {
  savedAlerts: {},
  addAlert(alert: IAlert) {
    this.savedAlerts = {
      ...this.savedAlerts,
      alert,
    }
  },
}
