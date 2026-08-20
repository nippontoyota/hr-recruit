import { request } from './client';
import type { User } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const response = await request('GET', '/users');
  return response.data.data;
};

export const createUser = async (data: any): Promise<User> => {
  const response = await request('POST', '/users', data);
  return response.data;
};

export const updateUser = async (id: string, data: any): Promise<User> => {
  const response = await request('PATCH', `/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await request('DELETE', `/users/${id}`);
};
