import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { createExpense } from '../lib/api'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'
import Avatar from './Avatar'
import SearchableSelect from './SearchableSelect'
import MultiSelectDropdown from './MultiSelectDropdown'

export default function AddExpenseModal({ isOpen, onClose, group, onSuccess }) {
  const { currentUser } = useUser()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUser.id)
  const [splitType, setSplitType] = useState('equal')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [customSplits, setCustomSplits] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const members = group?.group_members || []

  // Initialize participants when modal opens
  useEffect(() => {
    if (isOpen && members.length > 0) {
      setSelectedParticipants(members.map(m => m.user_id))
      setPaidBy(currentUser.id)
    }
  }, [isOpen, members])

  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const calculateSplits = () => {
    const totalAmount = parseFloat(amount)
    if (isNaN(totalAmount) || totalAmount <= 0) return []

    if (splitType === 'equal') {
      const perPerson = totalAmount / selectedParticipants.length
      return selectedParticipants.map(userId => ({
        user_id: userId,
        amount: parseFloat(perPerson.toFixed(2)),
        percentage: (100 / selectedParticipants.length).toFixed(2)
      }))
    } else {
      // Custom/unequal splits
      return selectedParticipants.map(userId => ({
        user_id: userId,
        amount: parseFloat(customSplits[userId] || 0),
        percentage: null
      }))
    }
  }

  const validateSplits = () => {
    const totalAmount = parseFloat(amount)
    const splits = calculateSplits()
    const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0)
    
    return Math.abs(splitTotal - totalAmount) < 0.01
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    const totalAmount = parseFloat(amount)
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (selectedParticipants.length === 0) {
      setError('Select at least one participant')
      return
    }

    if (!validateSplits()) {
      setError('Split amounts must equal total amount')
      return
    }

    try {
      setLoading(true)
      const splits = calculateSplits()
      
      await createExpense({
        group_id: group.id,
        description: description.trim(),
        amount: totalAmount,
        paid_by: paidBy,
        split_type: splitType,
        splits
      }, currentUser.id)

      onSuccess()
      // Reset form
      setDescription('')
      setAmount('')
      setSplitType('equal')
      setCustomSplits({})
    } catch (error) {
      console.error('Error creating expense:', error)
      setError('Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense" maxWidth="lg">
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Amount */}
        <div>
          <label className="text-sm font-medium text-whatsapp-text-secondary mb-2 block">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-whatsapp-text-primary text-lg">
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-3 py-3 bg-whatsapp-bg-input text-whatsapp-text-primary text-2xl font-bold rounded-lg border border-whatsapp-border focus:border-whatsapp-green focus:outline-none"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Description */}
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this expense for?"
          required
        />

        {/* Paid By */}
        <div>
          <label className="text-sm font-medium text-whatsapp-text-secondary mb-2 block">
            Who paid? *
          </label>
          <SearchableSelect
            members={members.map(m => ({
              user_id: m.user_id,
              display_name: m.user?.display_name || 'Unknown',
            }))}
            selectedId={paidBy}
            onSelect={setPaidBy}
            currentUserId={currentUser.id}
            label="Select who paid"
          />
        </div>

        {/* Split Type */}
        <div>
          <label className="text-sm font-medium text-whatsapp-text-secondary mb-2 block">
            Split type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                splitType === 'equal'
                  ? 'bg-whatsapp-green text-white'
                  : 'bg-whatsapp-bg-input text-whatsapp-text-primary hover:bg-whatsapp-hover'
              }`}
            >
              Equal
            </button>
            <button
              type="button"
              onClick={() => setSplitType('unequal')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                splitType === 'unequal'
                  ? 'bg-whatsapp-green text-white'
                  : 'bg-whatsapp-bg-input text-whatsapp-text-primary hover:bg-whatsapp-hover'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="text-sm font-medium text-whatsapp-text-secondary mb-2 block">
            Split between *
          </label>
          <MultiSelectDropdown
            members={members.map(m => ({
              user_id: m.user_id,
              display_name: m.user?.display_name || 'Unknown',
            }))}
            selectedIds={selectedParticipants}
            onToggle={toggleParticipant}
            onSelectAll={() => setSelectedParticipants(members.map(m => m.user_id))}
            onDeselectAll={() => setSelectedParticipants([])}
            currentUserId={currentUser.id}
            label="Select members to split with"
          />

          {/* Split amounts for selected participants */}
          {selectedParticipants.length > 0 && amount && (
            <div className="space-y-2 mt-3 max-h-52 overflow-y-auto">
              {members.filter(m => selectedParticipants.includes(m.user_id)).map((member) => {
                const splitAmount = splitType === 'equal'
                  ? (parseFloat(amount) / selectedParticipants.length).toFixed(2)
                  : customSplits[member.user_id] || '0.00'

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2.5 bg-whatsapp-bg-input rounded-lg"
                  >
                    <Avatar name={member.user?.display_name} size="sm" />
                    <span className="flex-1 text-whatsapp-text-primary truncate">
                      {member.user?.display_name}
                    </span>
                    
                    {splitType === 'equal' && (
                      <span className="text-sm text-whatsapp-text-secondary">
                        ${splitAmount}
                      </span>
                    )}
                    
                    {splitType === 'unequal' && (
                      <input
                        type="number"
                        step="0.01"
                        value={customSplits[member.user_id] || ''}
                        onChange={(e) => setCustomSplits(prev => ({
                          ...prev,
                          [member.user_id]: e.target.value
                        }))}
                        className="w-24 px-2 py-1 bg-whatsapp-bg-chat text-whatsapp-text-primary rounded border border-whatsapp-border focus:border-whatsapp-green focus:outline-none text-right"
                        placeholder="0.00"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Adding...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
