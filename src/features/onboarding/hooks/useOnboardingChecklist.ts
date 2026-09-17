import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getCompany, getHolidays, getSchedules } from '@/lib/services/companyService'
import { getEmployees } from '@/lib/services/employeeService'
import { getStatutoryConfig } from '@/lib/services/payrollService'
import { getUsers } from '@/lib/services/userService'

export interface ChecklistStep {
  id: string
  label: string
  description: string
  done: boolean
  link: string
}

export function useOnboardingChecklist() {
  const { user } = useSession()
  const [steps, setSteps] = useState<ChecklistStep[] | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [company, employees, schedules, holidays, statutory, users] = await Promise.all([
        getCompany(user),
        getEmployees(user),
        getSchedules(user),
        getHolidays(user),
        getStatutoryConfig(user),
        getUsers(user),
      ])

      if (cancelled) return

      setSteps([
        {
          id: 'company-info',
          label: 'Company Information',
          description: 'Name, timezone, and payroll frequency are set.',
          done: Boolean(company?.name && company.timezone),
          link: '/company-settings',
        },
        {
          id: 'work-schedule',
          label: 'Work Schedule',
          description: 'At least one work schedule is defined.',
          done: schedules.length > 0,
          link: '/company-settings',
        },
        {
          id: 'holidays',
          label: 'Company Holidays',
          description: 'Holiday calendar is configured for attendance and payroll.',
          done: holidays.length > 0,
          link: '/company-settings',
        },
        {
          id: 'government-tax',
          label: 'Government & Tax Settings',
          description: 'SSS, PhilHealth, Pag-IBIG, and withholding tax rules are configured.',
          done: Boolean(statutory),
          link: '/statutory',
        },
        {
          id: 'employees',
          label: 'Add Employees',
          description: 'At least one employee has been added to the roster.',
          done: employees.length > 0,
          link: '/employees',
        },
        {
          id: 'invite-users',
          label: 'Invite Users',
          description: 'HR, payroll, managers, and employees have accounts.',
          done: users.length > 1,
          link: '/user-access',
        },
      ])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return steps ?? []
}
