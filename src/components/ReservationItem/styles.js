import { StyleSheet } from 'react-native'

const cellWidth = '100%'
const dateBlockColor = '#006971'

const styles = StyleSheet.create({
  containerSingle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    width: cellWidth,
  },
  dateContainer: {
    height: '100%',
    flex: 1.5,
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 5,
  },
  contentContainer: {
    height: '100%',
    flex: 8.5,
    flexDirection: 'row',
    marginLeft: 15,
  },

  contentTextContainer: {
    height: 'auto',
    width: 'auto',
    padding: 20,
    justifyContent: 'space-around',
    backgroundColor: 'white',
  },
  contentIconContainer: {
    width: 'auto',
    height: 'auto',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: 10,
    justifyContent: 'space-around',
    backgroundColor: 'white',
  },
  reservationIconStyle: {
    width: 30,
    height: 99,
  },
  dateSeparatorLine: {
    width: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    // lineHeight: 18,
    color: '#595959',
  },
  contentBody: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    color: '#9B9B9B',
  },
  dateMonth: {
    fontSize: 15,
    fontWeight: '500',
    color: dateBlockColor,
  },
  dateDay: {
    fontSize: 25,
    color: dateBlockColor,
    fontWeight: '100',
  },
  dateWeek: {
    fontSize: 11,
    fontWeight: '100',
    color: dateBlockColor,
  },
})

export default styles
