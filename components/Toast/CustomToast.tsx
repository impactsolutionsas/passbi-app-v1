import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from "react-i18next";

const CustomToast = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState({ title: '', body: '' });
  const [type, setType] = useState('error'); // error, success, info
const { t, i18n } = useTranslation();
 
  useImperativeHandle(ref, () => ({
    show: (title:any, body:any, toastType = 'error', duration = 10000) => {
      setMessage({ title, body });
      setType(toastType);
      setVisible(true);
      
      if (duration > 0) {
        setTimeout(() => {
          setVisible(false);
        }, duration);
      }
    },
    hide: () => setVisible(false)
  }));

  const getIconName = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'info': return 'information-circle';
      default: return 'alert-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return 'green';
      case 'info': return '#0096F0';
      default: return 'red';
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Ionicons name={getIconName()} size={28} color={getIconColor()} />
            <Text style={styles.title}>{message.title}</Text>
          </View>
          <Text style={styles.body}>{message.body}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#0096F0' }]}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.buttonText}>{t('ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

CustomToast.displayName = 'CustomToast';

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  title: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  body: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16
  }
});

export default CustomToast;