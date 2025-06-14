import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const STORAGE_KEY = '@todo_items';

export default function App() {
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [formState, setFormState] = useState({
    id: null,
    title: '',
    description: '',
    desmarcarTipo: null,
    dayOfWeek: null,
    amountOfDays: '',
    isMarked: false,
    lastMarked: null,
    nextUnmarkDate: null
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) setItems(JSON.parse(data));
  };

  const saveItems = async (newItems) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    setItems(newItems);
  };

  const resetForm = () => {
    setFormState({
      id: null,
      title: '',
      description: '',
      desmarcarTipo: null,
      dayOfWeek: null,
      amountOfDays: '',
      isMarked: false,
      lastMarked: null,
      nextUnmarkDate: null
    });
  };

  const calculateNextUnmark = (state) => {
    const now = new Date();
    if (state.desmarcarTipo === 'cada semana') {
      const daysMap = { lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6, domingo: 0 };
      const targetDay = daysMap[state.dayOfWeek];
      let diff = (targetDay + 7 - now.getDay()) % 7;
      if (diff === 0) diff = 7;
      now.setDate(now.getDate() + diff);
      return now.toISOString();
    }
    if (state.desmarcarTipo === 'cada mes') {
      now.setMonth(now.getMonth() + 1);
      now.setDate(parseInt(state.dayOfWeek) || 1);
      return now.toISOString();
    }
    if (state.desmarcarTipo === 'cada tantos días') {
      now.setDate(now.getDate() + parseInt(state.amountOfDays || '1'));
      return now.toISOString();
    }
    return null;
  };

  const handleSave = () => {
    const updatedState = {
      ...formState,
      lastMarked: formState.isMarked ? new Date().toISOString() : null,
      nextUnmarkDate: formState.isMarked ? calculateNextUnmark(formState) : null
    };

    let newItems = [];
    if (formState.id) {
      newItems = items.map(it => it.id === formState.id ? updatedState : it);
    } else {
      updatedState.id = Date.now().toString();
      newItems = [...items, updatedState];
    }

    saveItems(newItems);
    resetForm();
    setModalVisible(false);
  };

  const toggleMark = (id) => {
    const newItems = items.map(it => {
      if (it.id === id) {
        const wasMarked = it.isMarked;
        const isNowMarked = !it.isMarked;
        return {
          ...it,
          isMarked: isNowMarked,
          lastMarked: !wasMarked ? new Date().toISOString() : it.lastMarked,
          nextUnmarkDate: calculateNextUnmark(it)
        };
      }
      return it;
    });
    saveItems(newItems);
  };

  const openViewModal = (item) => {
    setEditingItem(item);
    setViewModalVisible(true);
  };

  const openEditModal = (item) => {
    setFormState({ ...item });
    setViewModalVisible(false);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Button title="Añadir ítem" onPress={() => setModalVisible(true)} />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TodoItem
            item={item}
            onToggleMark={() => toggleMark(item.id)}
            onView={() => openViewModal(item)}
          />
        )}
      />

      <FormModal
        visible={modalVisible}
        onClose={() => { resetForm(); setModalVisible(false); }}
        formState={formState}
        setFormState={setFormState}
        onSave={handleSave}
      />

      <ViewModal
        visible={viewModalVisible}
        item={editingItem}
        onClose={() => setViewModalVisible(false)}
        onEdit={() => openEditModal(editingItem)}
      />
    </View>
  );
}

const TodoItem = ({ item, onToggleMark, onView }) => (
  <TouchableOpacity style={styles.itemRow} onPress={onView}>
    <TouchableOpacity onPress={onToggleMark} style={styles.checkbox}>
      <Text>{item.isMarked ? '✅' : '⬜'}</Text>
    </TouchableOpacity>
    <View style={{ flex: 1 }}>
      <Text style={styles.itemTitle}>{item.title || '(Sin título)'}</Text>
      <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
      <Text style={styles.meta}>Marcado: {item.lastMarked ? new Date(item.lastMarked).toLocaleString() : 'Nunca'}</Text>
      {item.nextUnmarkDate && (
        <Text style={styles.meta}>Próximo desmarque: {new Date(item.nextUnmarkDate).toLocaleString()}</Text>
      )}
    </View>
  </TouchableOpacity>
);

const FormModal = ({ visible, onClose, formState, setFormState, onSave }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <ScrollView>
          <Text style={styles.modalTitle}>{formState.id ? 'Editar ítem' : 'Nuevo ítem'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Título (opcional)"
            value={formState.title}
            onChangeText={text => setFormState({ ...formState, title: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Descripción (opcional)"
            value={formState.description}
            onChangeText={text => setFormState({ ...formState, description: text })}
          />

          <Text style={styles.label}>¿Cuándo desmarcar?</Text>
          <Dropdown
            style={styles.dropdown}
            data={[
              { label: 'Manualmente', value: 'manual' },
              { label: 'Cada semana', value: 'cada semana' },
              { label: 'Cada mes', value: 'cada mes' },
              { label: 'Cada tantos días', value: 'cada tantos días' },
            ]}
            labelField="label"
            valueField="value"
            placeholder="Selecciona una opción"
            value={formState.desmarcarTipo}
            onChange={item => {
              setFormState({ 
                ...formState, 
                desmarcarTipo: item.value, 
                dayOfWeek: null, 
                amountOfDays: '' 
              });
            }}
          />

          {formState.desmarcarTipo === 'cada semana' && (
            <>
              <Text style={styles.label}>Día de la semana</Text>
              <Dropdown
                style={styles.dropdown}
                data={[
                  { label: 'Lunes', value: 'lunes' },
                  { label: 'Martes', value: 'martes' },
                  { label: 'Miércoles', value: 'miércoles' },
                  { label: 'Jueves', value: 'jueves' },
                  { label: 'Viernes', value: 'viernes' },
                  { label: 'Sábado', value: 'sábado' },
                  { label: 'Domingo', value: 'domingo' },
                ]}
                labelField="label"
                valueField="value"
                placeholder="Selecciona el día"
                value={formState.dayOfWeek}
                onChange={item => setFormState({ ...formState, dayOfWeek: item.value })}
              />
            </>
          )}

          {formState.desmarcarTipo === 'cada mes' && (
            <>
              <Text style={styles.label}>Día del mes (1-31)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formState.dayOfWeek}
                onChangeText={text => setFormState({ ...formState, dayOfWeek: text })}
                placeholder="Ej: 15"
              />
            </>
          )}

          {formState.desmarcarTipo === 'cada tantos días' && (
            <>
              <Text style={styles.label}>Número de días</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formState.amountOfDays}
                onChangeText={text => setFormState({ ...formState, amountOfDays: text })}
                placeholder="Ej: 10"
              />
            </>
          )}

          <Text style={styles.label}>Estado</Text>
          <TouchableOpacity onPress={() => setFormState({ ...formState, isMarked: !formState.isMarked })} style={styles.checkbox}>
            <Text>{formState.isMarked ? '✅ Marcado' : '⬜ Desmarcado'}</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <Button title="Guardar" onPress={onSave} />
            <Button title="Cancelar" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const ViewModal = ({ visible, item, onClose, onEdit }) => (
  <Modal visible={visible} animationType="fade" transparent={true}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {item && (
          <>
            <Text style={styles.modalTitle}>{item.title || '(Sin título)'}</Text>
            <Text style={{ marginBottom: 10 }}>{item.description}</Text>
            <Text style={styles.meta}>Desmarcar: {item.desmarcarTipo}</Text>
            <Text style={styles.meta}>Marcado: {item.lastMarked ? new Date(item.lastMarked).toLocaleString() : 'Nunca'}</Text>
            {item.nextUnmarkDate && (
              <Text style={styles.meta}>Próximo desmarque: {new Date(item.nextUnmarkDate).toLocaleString()}</Text>

            )}
            <View style={styles.buttonRow}>
              <Button title="Editar" onPress={onEdit} />
              <Button title="Cerrar" onPress={onClose} />
            </View>
          </>
        )}
      </View>
    </View>
  </Modal>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 50,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  checkbox: {
    marginRight: 10,
  },
  itemTitle: {
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#666',
  },
  meta: {
    fontSize: 10,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    padding: 6,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  }
});
