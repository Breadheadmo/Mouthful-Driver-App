import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  btnIcon: {
    height: 30,
    width: 30,
    elevation: 4,
    shadowRadius: 3,
  },
  driverListPanel: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 250,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  driverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  driverName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  driverDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsPanel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
  },
  statsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default styles
