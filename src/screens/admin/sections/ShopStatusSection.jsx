import React from 'react';
import { Alert } from 'react-native';
import { ShopStatusForm } from '../../../components/ShopStatusFormModal';

export default function ShopStatusSection() {
  return <ShopStatusForm onSaved={() => Alert.alert('Saved', 'Shop status updated.')} />;
}
