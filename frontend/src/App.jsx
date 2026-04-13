import { useEffect, useMemo, useState } from 'react'

/*const initialTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Finish cloud project proposal',
    course: 'ITWS 4500',
    dueDate: '2026-04-11',
    priority: 'High',
    status: 'In Progress',
    notes: 'Outline Azure architecture and MVP scope'
  },
  {
    id: crypto.randomUUID(),
    title: 'Study for networking quiz',
    course: 'CSCI 4380',
    dueDate: '2026-04-10',
    priority: 'Medium',
    status: 'Not Started',
    notes: 'Review routing and traceroute'
  },
  {
    id: crypto.randomUUID(),
    title: 'Draft work report',
    course: 'Professional Development',
    dueDate: '2026-04-15',
    priority: 'High',
    status: 'Not Started',
    notes: 'Need 3 to 5 pages'
  }
]*/

const emptyForm = {
  title: '',
  course: '',
  dueDate: '',
  priority: 'Medium',
  status: 'Not Started',
  notes: ''
}

function App() {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({
    course: '',
    status: 'All',
    priority: 'All'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const res = await fetch('/api/tasks')

        if (!res.ok) {
          throw new Error('Failed to load assignments.')
        }

        const data = await res.json()
        setTasks(data)
      } catch (error) {
        console.error('Failed to load tasks:', error)
        setErrorMessage('Could not load assignments. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTasks()
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesCourse =
        filters.course.trim() === '' ||
        task.course.toLowerCase().includes(filters.course.toLowerCase())

      const matchesStatus =
        filters.status === 'All' || task.status === filters.status

      const matchesPriority =
        filters.priority === 'All' || task.priority === filters.priority

      return matchesCourse && matchesStatus && matchesPriority
    })
  }, [tasks, filters])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'Done').length
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length

    return { total, completed, inProgress, overdue }
  }, [tasks])

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.title.trim() || !form.course.trim() || !form.dueDate) {
      setErrorMessage('Please fill in title, course, and due date.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const isEditing = editingId !== null
      const url = isEditing ? `/api/tasks/${editingId}` : '/api/tasks'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        throw new Error(isEditing ? 'Failed to update assignment.' : 'Failed to create assignment.')
      }

      const savedTask = await res.json()

      if (isEditing) {
        setTasks((prev) =>
          prev.map((task) => (task.id === editingId ? savedTask : task))
        )
      } else {
        setTasks((prev) => [savedTask, ...prev])
      }

      setForm(emptyForm)
      setEditingId(null)
    } catch (error) {
      console.error(error)
      setErrorMessage(editingId ? 'Could not update assignment.' : 'Could not create assignment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEdit(task) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      course: task.course,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      notes: task.notes
    })
  }

  async function handleDelete(id) {
    setErrorMessage('')

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete assignment.')
      }

      setTasks((prev) => prev.filter((task) => task.id !== id))

      if (editingId === id) {
        setEditingId(null)
        setForm(emptyForm)
      }
    } catch (error) {
      console.error(error)
      setErrorMessage('Could not delete assignment.')
    }
  }

  async function handleStatusChange(id, newStatus) {
    setErrorMessage('')

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) {
        throw new Error('Failed to update assignment status.')
      }

      const updatedTask = await res.json()

      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updatedTask : task))
      )

      if (editingId === id) {
        setForm((prev) => ({
          ...prev,
          status: updatedTask.status
        }))
      }
    } catch (error) {
      console.error(error)
      setErrorMessage('Could not update assignment status.')
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Azure Assignment Tracker</p>
          <h1>Assignment Dashboard</h1>
          <p className="subtitle">
            A cloud-based task manager built with Azure Functions and Azure Table Storage.
          </p>
        </div>
      </header>

      {errorMessage && <div className="message-banner error-banner">{errorMessage}</div>}
      {isLoading && <div className="message-banner loading-banner">Loading assignments...</div>}

      <section className="stats-grid">
        <StatCard label="Total Tasks" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="In Progress" value={stats.inProgress} />
        <StatCard label="Overdue" value={stats.overdue} />
      </section>

      <main className="main-grid">
        <section className="panel">
          <h2>{editingId ? 'Edit Assignment' : 'Add Assignment'}</h2>

          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="Ex: Finish report draft"
              />
            </label>

            <label>
              Course
              <input
                type="text"
                name="course"
                value={form.course}
                onChange={handleFormChange}
                placeholder="Ex: CSCI 4380"
              />
            </label>

            <label>
              Due Date
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Priority
              <select
                name="priority"
                value={form.priority}
                onChange={handleFormChange}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>

            <label>
              Status
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </label>

            <label>
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                rows="4"
                placeholder="Optional notes"
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isSubmitting
                  ? editingId
                    ? 'Saving...'
                    : 'Adding...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Assignment'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={cancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Assignments</h2>
          </div>

          <div className="filters">
            <input
              type="text"
              name="course"
              value={filters.course}
              onChange={handleFilterChange}
              placeholder="Filter by course"
            />

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option>All</option>
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
            >
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div className="task-list">
            {filteredTasks.length === 0 ? (
                <p className="empty-state">
                  {isLoading ? 'Loading assignments...' : 'No assignments match your filters.'}
                </p>
              ) : (
              filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className={`task-card ${isOverdue(task.dueDate, task.status) ? 'overdue' : ''}`}
                >
                  <div className="task-top-row">
                    <div>
                      <h3>{task.title}</h3>
                      <p className="muted">
                        {task.course} • Due {formatDate(task.dueDate)}
                      </p>
                    </div>

                    <span className={`badge ${priorityClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <p className="notes">{task.notes || 'No additional notes.'}</p>

                  <div className="task-bottom-row">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option>Not Started</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>

                    <div className="task-actions">
                      <button
                        className="secondary-btn small-btn"
                        onClick={() => handleEdit(task)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-btn small-btn"
                        onClick={() => handleDelete(task.id)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  )
}

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString()
}

function isOverdue(dueDate, status) {
  if (status === 'Done') return false
  const today = new Date()
  const due = new Date(dueDate + 'T00:00:00')
  today.setHours(0, 0, 0, 0)
  return due < today
}

function priorityClass(priority) {
  if (priority === 'High') return 'priority-high'
  if (priority === 'Medium') return 'priority-medium'
  return 'priority-low'
}

export default App