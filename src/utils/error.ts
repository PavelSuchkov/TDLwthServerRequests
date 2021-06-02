import { setAppErrorAC, SetAppErrorActionType, setAppStatusAC, SetAppStatusActionType } from '../app/app-reducer';
import { Dispatch } from 'redux';
import { ResponseType } from '../api/todolists-api';

// generic function
export const handleServerAppError = <T>(data: ResponseType<T>, dispatch: ErrorUtilsDispatchType) => {
    if (data.messages.length) {
        dispatch(setAppErrorAC({error: data.messages[0]}))
    } else {
        dispatch(setAppErrorAC({error: 'Some error occurred'}))
    }
    dispatch(setAppStatusAC({status: 'failed'}))
}

export const handleServerNetworkError = (error: {message: string}, dispatch: ErrorUtilsDispatchType) => {
    dispatch(setAppErrorAC(error.message ? {error: error.message}  : {error: 'Some error occurred'}))
    dispatch(setAppStatusAC({status: 'failed'}))
}

export type ErrorUtilsDispatchType = Dispatch<SetAppErrorActionType | SetAppStatusActionType>
