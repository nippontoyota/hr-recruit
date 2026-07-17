import api from './client';
import type { User } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const getInterviewers = async (): Promise<User[]> => {
  const response = await api.get('/users/interviewers');
  return response.data;
};

export const createUser = async (data: any): Promise<User> => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUser = async (id: string, data: any): Promise<User> => {
  const response = await api.patch(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};
