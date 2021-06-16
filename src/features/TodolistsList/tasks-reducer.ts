import {addTodolistAC, removeTodolistAC, setTodolistsAC} from './todolists-reducer'
import {TaskPriorities, TaskStatuses, TaskType, todolistsAPI, UpdateTaskModelType} from '../../api/todolists-api'
import {Dispatch} from 'redux'
import {AppRootStateType} from '../../app/store'
import {RequestStatusType, setAppStatusAC,} from "../../app/app-reducer";
import {AxiosError} from "axios";
import {handleServerAppError, handleServerNetworkError} from "../../utils/error";
import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";

const initialState: TasksStateType = {}

export const fetchTasks = createAsyncThunk('/tasks/fetchTasks', (todolistId: string, thunkAPI) => {
    thunkAPI.dispatch(setAppStatusAC({status: 'loading'}))
    return todolistsAPI.getTasks(todolistId)
        .then((res) => {
            thunkAPI.dispatch(setAppStatusAC({status: 'succeeded'}))
            return {tasks: res.data.items, todolistId}
        })
})

export const removeTaskTC = createAsyncThunk('/tasks/removeTask', (param: { taskId: string, todolistId: string }, thunkAPI) => {
    thunkAPI.dispatch(setAppStatusAC({status: 'loading'}));
    thunkAPI.dispatch(changeTaskEntityStatusAC({
        todolistId: param.todolistId,
        taskId: param.taskId,
        entityStatus: 'loading'
    }));
    todolistsAPI.deleteTask(param.todolistId, param.taskId)
        .then(res => {
            if (res.data.resultCode === 0) {
                thunkAPI.dispatch(removeTaskAC({
                    taskId: param.taskId,
                    todolistId: param.todolistId
                }))
                thunkAPI.dispatch(setAppStatusAC({status: 'succeeded'}))
            } else {
                handleServerAppError(res.data, thunkAPI.dispatch)
            }
        })
        .catch((err: AxiosError) => {
            handleServerNetworkError(err, thunkAPI.dispatch)
        })
        .finally(() => {
            thunkAPI.dispatch(changeTaskEntityStatusAC({
                todolistId: param.todolistId,
                taskId: param.taskId, entityStatus: 'idle'
            }));
        })
})

export const addTaskTC = (title: string, todolistId: string) => (dispatch: Dispatch) => {
    dispatch(setAppStatusAC({status: 'loading'}))
    todolistsAPI.createTask(todolistId, title)
        .then(res => {
            if (res.data.resultCode === 0) {
                dispatch(addTaskAC({task: res.data.data.item}))
                dispatch(setAppStatusAC({status: 'succeeded'}))
            } else {
                handleServerAppError(res.data, dispatch)
            }
        })
        .catch((err: AxiosError) => {
            handleServerNetworkError(err, dispatch)
        })
}



const slice = createSlice({

    name: 'tasks',
    initialState: initialState,
    reducers: {
        removeTaskAC(state, action: PayloadAction<{ taskId: string, todolistId: string }>) {
            const tasks = state[action.payload.todolistId];
            const index = tasks.findIndex(t => t.id === action.payload.taskId);
            if (index > -1) {
                tasks.splice(index, 1)
            }
        },
        addTaskAC(state, action: PayloadAction<{ task: TaskType }>) {
            state[action.payload.task.todoListId].unshift(action.payload.task);
        },
        updateTaskAC(state, action: PayloadAction<{ taskId: string, model: UpdateDomainTaskModelType, todolistId: string }>) {
            const tasks = state[action.payload.todolistId];
            const index = tasks.findIndex(t => t.id === action.payload.taskId);
            if (index > -1) {
                tasks[index] = {...tasks[index], ...action.payload.model}
            }
        },
        changeTaskEntityStatusAC(state, action: PayloadAction<{ todolistId: string, taskId: string, entityStatus: RequestStatusType }>) {
            const tasks = state[action.payload.todolistId];
            const index = tasks.findIndex(t => t.id === action.payload.taskId);
            if (index > -1) {
                tasks[index].entityStatus = action.payload.entityStatus
            }
        }
    },
    extraReducers: (builder) => {
        builder.addCase(addTodolistAC, (state, action) => {
            state[action.payload.todolist.id] = []
        });
        builder.addCase(removeTodolistAC, (state, action) => {
            delete state[action.payload.id];
        });
        builder.addCase(setTodolistsAC, (state, action) => {
            action.payload.todolists.forEach(tl => state[tl.id] = [])
        });
        builder.addCase(fetchTasks.fulfilled, (state, action) => {
            state[action.payload.todolistId] = action.payload.tasks
        });

    }

})

export const {removeTaskAC, addTaskAC, updateTaskAC, /*setTasksAC,*/ changeTaskEntityStatusAC} = slice.actions
export const taskReducer = slice.reducer;


// thunks
// export const fetchTasks = (todolistId: string) => (dispatch: Dispatch) => {
//     dispatch(setAppStatusAC({status: 'loading'}))
//     todolistsAPI.getTasks(todolistId)
//         .then((res) => {
//             dispatch(setTasksAC({tasks: res.data.items, todolistId}))
//             dispatch(setAppStatusAC({status: 'succeeded'}))
//         })
// }



export const updateTaskTC = (taskId: string, domainModel: UpdateDomainTaskModelType, todolistId: string) =>
    (dispatch: Dispatch, getState: () => AppRootStateType) => {
        const state = getState()
        const task = state.tasks[todolistId].find(t => t.id === taskId)

        if (!task) {
            //throw new Error("task not found in the state");
            console.warn('task not found in the state')
            return
        }
        const apiModel: UpdateTaskModelType = {
            deadline: task.deadline,
            description: task.description,
            priority: task.priority,
            startDate: task.startDate,
            title: task.title,
            status: task.status,
            ...domainModel
        }
        dispatch(setAppStatusAC({status: 'loading'}));
        dispatch(changeTaskEntityStatusAC({todolistId, taskId, entityStatus: 'loading'}));
        todolistsAPI.updateTask(todolistId, taskId, apiModel)
            .then(res => {
                if (res.data.resultCode === 0) {
                    dispatch(updateTaskAC({taskId, model: domainModel, todolistId}))
                    dispatch(setAppStatusAC({status: 'succeeded'}))
                } else {
                    handleServerAppError(res.data, dispatch)
                }
            })
            .catch((err: AxiosError) => {
                handleServerNetworkError(err, dispatch)
            })
            .finally(() => {
                dispatch(changeTaskEntityStatusAC({todolistId, taskId, entityStatus: 'idle'}));
            })
    }

// types
export type UpdateDomainTaskModelType = {
    title?: string
    description?: string
    status?: TaskStatuses
    priority?: TaskPriorities
    startDate?: string
    deadline?: string
}
export type TasksStateType = {
    [key: string]: Array<TaskType>
}

