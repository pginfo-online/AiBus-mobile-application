import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { ValidateCouponPayload, ValidateCouponResponse } from '../../types/api';

export function useValidateCouponMutation() {
  return useMutation<ValidateCouponResponse, Error, ValidateCouponPayload>({
    mutationFn: async (payload: ValidateCouponPayload) => {
      const res = await apiClient.post('/coupons/validate', {
        code: payload.code.trim().toUpperCase(),
        totalFare: payload.totalFare,
        busId: payload.busId,
        operatorName: payload.operatorName,
        fromCityId: payload.fromCityId,
        toCityId: payload.toCityId,
      });

      return res.data?.data as ValidateCouponResponse;
    },
  });
}
