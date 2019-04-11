type Conditional = 'greater than' | 'less than' | 'equal to'

export interface IAlert {
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
    compareField: string,
    message: string,
  }
}

interface IAlertsState {
  savedAlerts: IAlert[]
  addAlert: (alert: IAlert) => void
  deleteAlert: (index: number) => void
}

export const AlertsState: IAlertsState = {
  savedAlerts: [],
  addAlert(alert: IAlert) {
    this.savedAlerts.push(alert)
  },
  deleteAlert(index: number) {
    this.savedAlerts.splice(index, 1)
  },
}
