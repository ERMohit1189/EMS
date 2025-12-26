import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AllowanceData {
  travel: number;
  food: number;
  accommodation: number;
  mobile: number;
  internet: number;
  utilities: number;
  parking: number;
  misc: number;
  notes?: string;
}

interface AllowanceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (editedData: AllowanceData, remark: string) => void;
  allowanceData: AllowanceData;
  employeeName: string;
  date: string;
  isLoading?: boolean;
  maxValues?: {
    travelMax?: number;
    foodMax?: number;
    accommodationMax?: number;
    mobileMax?: number;
    internetMax?: number;
    utilitiesMax?: number;
    parkingMax?: number;
    miscMax?: number;
  };
}

export function AllowanceApprovalModal({
  isOpen,
  onClose,
  onSubmit,
  allowanceData,
  employeeName,
  date,
  isLoading = false,
  maxValues = {},
}: AllowanceApprovalModalProps) {
  const [editedData, setEditedData] = useState<AllowanceData>(allowanceData);
  const [remark, setRemark] = useState('');

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEditedData(allowanceData);
      setRemark('');
    }
  }, [isOpen, allowanceData]);

  const handleFieldChange = (field: keyof AllowanceData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedData(prev => ({ ...prev, [field]: numValue }));
  };

  const calculateTotal = () => {
    return (
      (editedData.travel || 0) +
      (editedData.food || 0) +
      (editedData.accommodation || 0) +
      (editedData.mobile || 0) +
      (editedData.internet || 0) +
      (editedData.utilities || 0) +
      (editedData.parking || 0) +
      (editedData.misc || 0)
    );
  };

  const handleSubmit = () => {
    onSubmit(editedData, remark);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Approve Allowance</DialogTitle>
          <DialogDescription>
            Employee: <span className="font-semibold">{employeeName}</span> | Date: <span className="font-semibold">{new Date(date).toLocaleDateString()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Travel Allowance */}
            <div className="space-y-2">
              <Label htmlFor="travel">
                Travel {maxValues.travelMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.travelMax})</span>}
              </Label>
              <Input
                id="travel"
                type="number"
                min="0"
                max={maxValues.travelMax}
                step="0.01"
                value={editedData.travel}
                onChange={(e) => handleFieldChange('travel', e.target.value)}
                disabled={isLoading}
                className={editedData.travel > (maxValues.travelMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Food Allowance */}
            <div className="space-y-2">
              <Label htmlFor="food">
                Food {maxValues.foodMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.foodMax})</span>}
              </Label>
              <Input
                id="food"
                type="number"
                min="0"
                max={maxValues.foodMax}
                step="0.01"
                value={editedData.food}
                onChange={(e) => handleFieldChange('food', e.target.value)}
                disabled={isLoading}
                className={editedData.food > (maxValues.foodMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Accommodation Allowance */}
            <div className="space-y-2">
              <Label htmlFor="accommodation">
                Accommodation {maxValues.accommodationMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.accommodationMax})</span>}
              </Label>
              <Input
                id="accommodation"
                type="number"
                min="0"
                max={maxValues.accommodationMax}
                step="0.01"
                value={editedData.accommodation}
                onChange={(e) => handleFieldChange('accommodation', e.target.value)}
                disabled={isLoading}
                className={editedData.accommodation > (maxValues.accommodationMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Mobile Allowance */}
            <div className="space-y-2">
              <Label htmlFor="mobile">
                Mobile {maxValues.mobileMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.mobileMax})</span>}
              </Label>
              <Input
                id="mobile"
                type="number"
                min="0"
                max={maxValues.mobileMax}
                step="0.01"
                value={editedData.mobile}
                onChange={(e) => handleFieldChange('mobile', e.target.value)}
                disabled={isLoading}
                className={editedData.mobile > (maxValues.mobileMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Internet Allowance */}
            <div className="space-y-2">
              <Label htmlFor="internet">
                Internet {maxValues.internetMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.internetMax})</span>}
              </Label>
              <Input
                id="internet"
                type="number"
                min="0"
                max={maxValues.internetMax}
                step="0.01"
                value={editedData.internet}
                onChange={(e) => handleFieldChange('internet', e.target.value)}
                disabled={isLoading}
                className={editedData.internet > (maxValues.internetMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Utilities Allowance */}
            <div className="space-y-2">
              <Label htmlFor="utilities">
                Utilities {maxValues.utilitiesMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.utilitiesMax})</span>}
              </Label>
              <Input
                id="utilities"
                type="number"
                min="0"
                max={maxValues.utilitiesMax}
                step="0.01"
                value={editedData.utilities}
                onChange={(e) => handleFieldChange('utilities', e.target.value)}
                disabled={isLoading}
                className={editedData.utilities > (maxValues.utilitiesMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Parking Allowance */}
            <div className="space-y-2">
              <Label htmlFor="parking">
                Parking {maxValues.parkingMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.parkingMax})</span>}
              </Label>
              <Input
                id="parking"
                type="number"
                min="0"
                max={maxValues.parkingMax}
                step="0.01"
                value={editedData.parking}
                onChange={(e) => handleFieldChange('parking', e.target.value)}
                disabled={isLoading}
                className={editedData.parking > (maxValues.parkingMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>

            {/* Miscellaneous Allowance */}
            <div className="space-y-2">
              <Label htmlFor="misc">
                Miscellaneous {maxValues.miscMax && <span className="text-gray-500 text-sm">(Max: Rs {maxValues.miscMax})</span>}
              </Label>
              <Input
                id="misc"
                type="number"
                min="0"
                max={maxValues.miscMax}
                step="0.01"
                value={editedData.misc}
                onChange={(e) => handleFieldChange('misc', e.target.value)}
                disabled={isLoading}
                className={editedData.misc > (maxValues.miscMax || Infinity) ? 'border-red-500' : ''}
              />
            </div>
          </div>

          {/* Total Display */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-green-900">Total Allowance:</span>
              <span className="text-2xl font-bold text-green-600">Rs {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Employee Notes (Read-only) */}
          {allowanceData.notes && (
            <div className="space-y-2">
              <Label>Employee Notes:</Label>
              <div className="p-3 bg-gray-50 rounded border text-sm">
                {allowanceData.notes}
              </div>
            </div>
          )}

          {/* Approver Remark */}
          <div className="space-y-2">
            <Label htmlFor="remark">Approval Remark (Optional)</Label>
            <Textarea
              id="remark"
              placeholder="Add any remarks or notes about this approval..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Approving...' : 'Approve with Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
